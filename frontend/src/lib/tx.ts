import { API_URL } from '@/config/contracts';

export type TxStatus = 'pending' | 'success' | 'failed';

export async function getTxStatus(txId: string): Promise<TxStatus> {
  try {
    const res = await fetch(`${API_URL}/extended/v1/tx/${txId}`);
    const data = await res.json();

    if (data.tx_status === 'success') return 'success';
    if (
      data.tx_status === 'abort_by_response' ||
      data.tx_status === 'abort_by_post_condition'
    ) {
      return 'failed';
    }

    return 'pending';
  } catch {
    return 'pending';
  }
}

export async function pollTxStatus(
  txId: string,
  interval = 5000,
  timeout = 300000
): Promise<'success' | 'failed'> {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const status = await getTxStatus(txId);

    if (status === 'success') return 'success';
    if (status === 'failed') return 'failed';

    await new Promise((r) => setTimeout(r, interval));
  }

  return 'failed';
}
