import {
  AgentRuntimeErrorType,
  ChatCompletionErrorPayload,
  TextToImagePayload,
} from '@lobechat/model-runtime';
import { ChatErrorType } from '@lobechat/types';
import { NextResponse } from 'next/server';

import { checkAuth } from '@/app/(backend)/middleware/auth';
import { initModelRuntimeWithUserPayload } from '@/server/modules/ModelRuntime';
import { checkUserImageQuota } from '@/server/services/quota';
import { createErrorResponse } from '@/utils/errorResponse';

export const preferredRegion = [
  'arn1',
  'bom1',
  'cdg1',
  'cle1',
  'cpt1',
  'dub1',
  'fra1',
  'gru1',
  'hnd1',
  'iad1',
  'icn1',
  'kix1',
  'lhr1',
  'pdx1',
  'sfo1',
  'sin1',
  'syd1',
];

// return NextResponse.json(
//   {
//     body: {
//       endpoint: 'https://ai****ix.com/v1',
//       error: {
//         code: 'content_policy_violation',
//         message:
//           'Your request was rejected as a result of our safety system. Image descriptions generated from your prompt may contain text that is not allowed by our safety system. If you believe this was done in error, your request may succeed if retried, or by adjusting your prompt.',
//         param: null,
//         type: 'invalid_request_error',
//       },
//       provider: 'openai',
//     },
//     errorType: 'OpenAIBizError',
//   },
//   { status: 400 },
// );

export const POST = checkAuth(async (req: Request, { params, jwtPayload }) => {
  const { provider } = await params;

  try {
    // ============  0. check user quota   ============ //
    const userId = jwtPayload?.userId;
    console.log(`[Image Generation API] 检查用户 ${userId} 的图片生成配额`);

    const quotaCheck = await checkUserImageQuota(userId);
    if (!quotaCheck.allowed) {
      console.log(`[Image Generation API] ❌ 用户 ${userId} 配额不足: ${quotaCheck.reason}`);
      return createErrorResponse(AgentRuntimeErrorType.QuotaLimitReached, {
        error: quotaCheck.reason || '图片生成配额已用尽',
        provider,
      });
    }

    console.log(
      `[Image Generation API] ✅ 用户 ${userId} 配额检查通过，剩余: ${quotaCheck.remaining}`,
    );

    // ============  1. init chat model   ============ //
    const agentRuntime = await initModelRuntimeWithUserPayload(provider, jwtPayload);

    // ============  2. create chat completion   ============ //

    const data = (await req.json()) as TextToImagePayload;

    const images = await agentRuntime.textToImage(data);

    // ============  3. deduct quota after successful generation   ============ //
    // TODO: 调用配额服务扣减用户配额
    // await deductUserImageQuota(userId);
    console.log(`[Image Generation API] 成功生成图片，应扣减用户 ${userId} 配额`);

    return NextResponse.json(images);
  } catch (e) {
    const {
      errorType = ChatErrorType.InternalServerError,
      error: errorContent,
      ...res
    } = e as ChatCompletionErrorPayload;

    const error = errorContent || e;
    // track the error at server side
    console.error(`Route: [${provider}] ${errorType}:`, error);

    return createErrorResponse(errorType, { error, ...res, provider });
  }
});
