/**
 * 工具配额检查服务
 * 用于在服务端检查用户的工具使用配额
 * 在AI模型接收工具列表之前进行配额检查，避免不必要的提示词优化和处理
 */

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  remaining?: number;
}

/**
 * 检查用户的工具使用配额
 * @param userId 用户ID
 * @param toolId 工具标识符
 * @returns 配额检查结果
 */
export async function checkUserToolQuota(
  userId: string | undefined,
  toolId: string,
): Promise<QuotaCheckResult> {
  if (!userId) {
    return { allowed: false, reason: '未登录用户无法使用此工具' };
  }

  // DALL-E 图片生成配额检查
  if (toolId === 'lobe-image-designer') {
    console.log(`[Quota Check] 检查用户 ${userId} 的 DALL-E 图片生成配额`);

    // TODO: 调用实际的配额服务
    // const response = await fetch(`${process.env.QUOTA_SERVICE_URL}/api/quota/check`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ userId, type: 'image', tool: 'dalle' })
    // });
    // const data = await response.json();
    // return {
    //   allowed: data.hasQuota,
    //   remaining: data.remaining,
    //   reason: data.hasQuota ? undefined : '图片生成配额已用尽'
    // };

    // 测试：暂时禁用DALL-E
    console.log(`[Quota Check] ❌ 用户 ${userId} DALL-E配额已用尽（测试禁用）`);
    return { allowed: true, reason: '图片生成配额已用尽（测试）' };
  }

  // 网页搜索配额检查
  if (toolId === 'lobe-web-browsing') {
    console.log(`[Quota Check] 检查用户 ${userId} 的 Web搜索配额`);

    // TODO: 调用实际的配额服务
    // const response = await fetch(`${process.env.QUOTA_SERVICE_URL}/api/quota/check`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ userId, type: 'search', tool: 'web-browsing' })
    // });
    // const data = await response.json();
    // return {
    //   allowed: data.hasQuota,
    //   remaining: data.remaining,
    //   reason: data.hasQuota ? undefined : '搜索配额已用尽'
    // };

    // 测试：允许使用
    console.log(`[Quota Check] ✅ 用户 ${userId} Web搜索配额充足`);
    return { allowed: true };
  }

  // 其他工具默认允许
  console.log(`[Quota Check] ✅ 工具 ${toolId} 无配额限制，允许使用`);
  return { allowed: true };
}

/**
 * 过滤用户可用的工具列表
 * @param userId 用户ID
 * @param toolIds 原始工具ID列表
 * @returns 过滤后的工具ID列表
 */
export async function filterUserTools(
  userId: string | undefined,
  toolIds: string[],
): Promise<string[]> {
  if (!toolIds || toolIds.length === 0) {
    return [];
  }

  console.log(
    `[Quota Filter] 开始过滤工具列表，用户: ${userId}, 原始工具: [${toolIds.join(', ')}]`,
  );

  const filteredTools: string[] = [];

  for (const toolId of toolIds) {
    const quotaCheck = await checkUserToolQuota(userId, toolId);
    if (quotaCheck.allowed) {
      filteredTools.push(toolId);
    } else {
      console.log(`[Quota Filter] ❌ 工具 ${toolId} 被移除: ${quotaCheck.reason}`);
    }
  }

  console.log(`[Quota Filter] 过滤完成，剩余工具: [${filteredTools.join(', ')}]`);
  return filteredTools;
}
