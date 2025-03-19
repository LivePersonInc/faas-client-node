import got from 'got';

const agentVep = 'staging.agentvep.liveperson.net';

export async function getBearer(
  accountId: string,
  username: string,
  password: string
): Promise<string> {
  try {
    const resp = await got(
      `https://${agentVep}/api/account/${accountId}/login?v=1.3`,
      {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
        resolveBodyOnly: false,
        responseType: 'json',
        throwHttpErrors: false,
      }
    );
    // @ts-ignore
    return resp?.body?.bearer as string || "";
  } catch (e) {
    console.log(e);
    return '';
  }
}
