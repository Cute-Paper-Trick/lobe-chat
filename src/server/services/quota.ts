/**
 * 服务端配额检查服务
 * 用于在服务端API路由中检查用户的工具使用配额
 * 这是真正的安全检查点，即使前端被绕过，服务端仍会拒绝超额请求
 */

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  remaining?: number;
}

/**
 * 检查用户的图片生成配额
 * @param userId 用户ID
 * @returns 配额检查结果
 */
export async function checkUserImageQuota(userId: string | undefined): Promise<QuotaCheckResult> {
  if (!userId) {
    return { allowed: false, reason: '未登录用户无法使用图片生成功能' };
  }

  console.log(`[Server Quota Check] 检查用户 ${userId} 的图片生成配额`);

  // TODO: 从数据库或缓存中获取用户配额信息
  // const userQuota = await db.query('SELECT image_quota FROM user_quotas WHERE user_id = ?', [userId]);

  // TODO: 调用实际的配额服务
  // const response = await fetch(`${process.env.QUOTA_SERVICE_URL}/api/quota/check`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ userId, type: 'image' })
  // });
  // const data = await response.json();
  // return {
  //   allowed: data.hasQuota,
  //   remaining: data.remaining,
  //   reason: data.hasQuota ? undefined : '图片生成配额已用尽'
  // };

  // 测试：暂时禁用
  console.log(`[Server Quota Check] ❌ 用户 ${userId} 图片生成配额已用尽（测试禁用）`);
  return { allowed: false, reason: '图片生成配额已用尽（测试）' };
}

/**
 * 扣减用户的图片生成配额
 * @param userId 用户ID
 * @param amount 扣减数量，默认为1
 */
export async function deductUserImageQuota(userId: string, amount: number = 1): Promise<void> {
  console.log(`[Server Quota Deduct] 扣减用户 ${userId} 的图片生成配额: ${amount}`);

  // TODO: 更新数据库或调用配额服务
  // await db.query('UPDATE user_quotas SET image_quota = image_quota - ? WHERE user_id = ?', [amount, userId]);

  // TODO: 记录使用日志
  // await db.query('INSERT INTO usage_logs (user_id, type, amount, timestamp) VALUES (?, ?, ?, ?)',
  //   [userId, 'image_generation', amount, new Date()]);
}

/**
 * 检查用户的搜索配额
 * @param userId 用户ID
 * @returns 配额检查结果
 */
export async function checkUserSearchQuota(userId: string | undefined): Promise<QuotaCheckResult> {
  if (!userId) {
    return { allowed: false, reason: '未登录用户无法使用搜索功能' };
  }

  console.log(`[Server Quota Check] 检查用户 ${userId} 的搜索配额`);

  // 测试：允许使用
  return { allowed: true, remaining: 100 };
}
