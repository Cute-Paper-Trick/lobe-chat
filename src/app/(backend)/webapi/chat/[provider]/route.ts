import {
  AGENT_RUNTIME_ERROR_SET,
  ChatCompletionErrorPayload,
  ModelRuntime,
} from '@lobechat/model-runtime';
import { ChatErrorType } from '@lobechat/types';

import { checkAuth } from '@/app/(backend)/middleware/auth';
import { createTraceOptions, initModelRuntimeWithUserPayload } from '@/server/modules/ModelRuntime';
import { ChatStreamPayload } from '@/types/openai/chat';
import { createErrorResponse } from '@/utils/errorResponse';
import { getTracePayload } from '@/utils/trace';

export const maxDuration = 300;

export const POST = checkAuth(async (req: Request, { params, jwtPayload, createRuntime }) => {
  const { provider } = await params;
  console.log(`[Chat API] Provider: ${provider}, User: ${jwtPayload?.userId}`);
  try {
    // ============  1. init chat model   ============ //
    let modelRuntime: ModelRuntime;
    if (createRuntime) {
      modelRuntime = createRuntime(jwtPayload);
    } else {
      modelRuntime = await initModelRuntimeWithUserPayload(provider, jwtPayload);
    }

    // ============  2. create chat completion   ============ //

    let data: ChatStreamPayload;
    try {
      data = (await req.json()) as ChatStreamPayload;
      console.log(`[Chat API] Received request for model: ${data.model}`);
    } catch (jsonError: any) {
      console.error(`[Chat API] Failed to parse request JSON:`, jsonError?.message || jsonError);
      throw new Error('Invalid request body');
    }

    // 只对 OpenAI 提供商启用 stream_options 以获取 token 使用统计
    const enhancedData =
      provider === 'openai'
        ? {
            ...data,
            stream_options: {
              include_usage: true,
            },
          }
        : data;

    const tracePayload = getTracePayload(req);

    let traceOptions = {};
    // If user enable trace
    if (tracePayload?.enabled) {
      traceOptions = createTraceOptions(enhancedData, { provider, trace: tracePayload });
    }

    const response = await modelRuntime.chat(enhancedData, {
      user: jwtPayload.userId,
      ...traceOptions,
      signal: req.signal,
    });

    // 尝试获取当前使用的API key信息
    // 注意：API Key Manager 已经在 src/server/modules/ModelRuntime/apiKeyManager.ts 中输出了选中的key
    // 这里我们尝试从 runtime 对象中获取，但由于封装层次较深，可能无法直接访问
    let currentApiKeyInfo = null;
    try {
      // 调试：查看 modelRuntime 的结构
      console.log('ModelRuntime 结构:', Object.keys(modelRuntime));
      console.log(
        'ModelRuntime._runtime:',
        (modelRuntime as any)._runtime ? Object.keys((modelRuntime as any)._runtime) : 'undefined',
      );

      // 尝试多种方式获取API key
      const runtime = (modelRuntime as any)._runtime;
      let apiKey = null;

      // 方式1: 从 runtime 的 options 中获取
      if (runtime?._options?.apiKey) {
        apiKey = runtime._options.apiKey;
      }
      // 方式2: 从 runtime 的 config 中获取
      else if (runtime?.config?.apiKey) {
        apiKey = runtime.config.apiKey;
      }
      // 方式3: 直接从 runtime 中获取
      else if (runtime?.apiKey) {
        apiKey = runtime.apiKey;
      }

      if (apiKey) {
        currentApiKeyInfo = {
          maskedKey:
            apiKey.length > 12
              ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`
              : `${apiKey.slice(0, 4)}...`,
          provider: provider,
        };
      } else {
        // 如果无法获取，至少记录提供商
        currentApiKeyInfo = {
          maskedKey: '(从 API Key Manager 日志查看)',
          provider: provider,
        };
      }
    } catch (e: any) {
      console.log('获取API key信息失败:', e?.message || e);
    }

    // 如果响应有body，处理流式响应并统计token
    if (response.body) {
      let foundUsage = false;
      let buffer = ''; // 用于处理跨chunk的数据
      let currentEvent: string | null = null; // 保存当前事件类型

      const transformStream = new TransformStream({
        flush() {
          // 处理缓冲区中剩余的数据（如果有）
          if (buffer.trim() && !foundUsage && buffer.startsWith('data: ')) {
            const jsonStr = buffer.slice(6).trim();
            if (jsonStr && jsonStr !== '[DONE]') {
              try {
                const jsonData = JSON.parse(jsonStr);
                if (jsonData.usage) {
                  // 如果在最后找到usage，也记录下来
                  console.log('=== 🔑 API调用统计（流结束时） ===');
                  console.log(`总Token: ${jsonData.totalTokens || 0}`);
                  console.log('========================');
                }
              } catch {
                // 忽略解析错误
              }
            }
          }
        },

        transform(chunk, controller) {
          controller.enqueue(chunk);

          // 尝试解析chunk中的usage信息
          try {
            const decoder = new TextDecoder();
            const chunkText = decoder.decode(chunk, { stream: true });
            buffer += chunkText;

            // 处理缓冲区中的完整行
            const lines = buffer.split('\n');
            // 保留最后一个不完整的行在缓冲区
            buffer = lines.at(-1) || '';

            for (let i = 0; i < lines.length - 1; i++) {
              const line = lines[i]; // 不要trim，保留原始格式
              const trimmedLine = line.trim();

              // 处理 event: 行
              if (trimmedLine.startsWith('event: ')) {
                const eventType = trimmedLine.slice(7).trim();
                currentEvent = eventType;
                continue;
              }

              if (!trimmedLine) continue;

              // 处理 data: 行
              if (trimmedLine.startsWith('data: ')) {
                const dataStr = trimmedLine.slice(6).trim();

                // 如果当前事件是usage，尝试解析数据
                if (
                  currentEvent === 'usage' &&
                  !foundUsage && // 跳过空数据
                  dataStr &&
                  dataStr !== '""'
                ) {
                  try {
                    // 尝试解析JSON格式的usage数据
                    const usageData = JSON.parse(dataStr);
                    foundUsage = true;

                    console.log('=== 🔑 API调用统计 ===');
                    console.log(`时间戳: ${new Date().toISOString()}`);
                    console.log(`用户ID: ${jwtPayload.userId}`);
                    console.log(`提供商: ${provider}`);

                    if (currentApiKeyInfo) {
                      console.log(`🔑 API Key: ${currentApiKeyInfo.maskedKey}`);
                    } else {
                      console.log(`🔑 API Key: 未获取到信息`);
                    }

                    // 处理model-runtime的usage数据格式
                    const totalTokens = usageData.totalTokens || usageData.total_tokens || 0;
                    const inputTokens =
                      usageData.totalInputTokens ||
                      usageData.inputTextTokens ||
                      usageData.prompt_tokens ||
                      0;
                    const outputTokens =
                      usageData.totalOutputTokens ||
                      usageData.outputTextTokens ||
                      usageData.completion_tokens ||
                      0;

                    console.log(`📊 总Token: ${totalTokens}`);
                    console.log(`📥 输入Token: ${inputTokens}`);
                    console.log(`📤 输出Token: ${outputTokens}`);

                    // 额外的token信息（如果有的话）
                    if (usageData.inputTextTokens && usageData.inputTextTokens !== inputTokens) {
                      console.log(`📝 输入文本Token: ${usageData.inputTextTokens}`);
                    }
                    if (usageData.outputTextTokens && usageData.outputTextTokens !== outputTokens) {
                      console.log(`📝 输出文本Token: ${usageData.outputTextTokens}`);
                    }
                    if (usageData.outputReasoningTokens) {
                      console.log(`🧠 推理Token: ${usageData.outputReasoningTokens}`);
                    }

                    console.log('========================');

                    // 这里可以调用您的外部服务记录使用量
                    // await fetch('http://your-service/api/record-usage', {
                    //   method: 'POST',
                    //   headers: { 'Content-Type': 'application/json' },
                    //   body: JSON.stringify({
                    //     userId: jwtPayload.userId,
                    //     provider: provider,
                    //     apiKey: currentApiKeyInfo?.maskedKey,
                    //     totalTokens: totalTokens,
                    //     inputTokens: inputTokens,
                    //     outputTokens: outputTokens,
                    //     timestamp: new Date().toISOString()
                    //   })
                    // });
                  } catch (parseErr: any) {
                    // 忽略解析错误，继续处理下一个
                    console.error('解析usage数据失败:', parseErr?.message || parseErr);
                  }
                }
              }
            }
          } catch {
            // 静默忽略处理错误
          }
        },
      });

      // 应用转换流
      const transformedBody = response.body.pipeThrough(transformStream);

      return new Response(transformedBody, {
        headers: response.headers,
        status: response.status,
        statusText: response.statusText,
      });
    }

    // 如果没有body，直接返回原响应
    return response;
  } catch (e) {
    const {
      errorType = ChatErrorType.InternalServerError,
      error: errorContent,
      ...res
    } = e as ChatCompletionErrorPayload;

    const error = errorContent || e;

    const logMethod = AGENT_RUNTIME_ERROR_SET.has(errorType as string) ? 'warn' : 'error';
    // track the error at server side
    console[logMethod](`Route: [${provider}] ${errorType}:`, error);

    return createErrorResponse(errorType, { error, ...res, provider });
  }
});
