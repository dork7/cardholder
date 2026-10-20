// Crash-safe "write new bytes over an existing file": the new bytes are fully written to a temp name
// first, and only then moved over the destination. A failed write never touches the destination.
export interface ReplaceOps {
  write(name: string, bytes: Uint8Array): Promise<void>;
  moveOver(from: string, to: string): Promise<void>;
  remove(name: string): Promise<void>;
}

export async function atomicReplace(ops: ReplaceOps, name: string, bytes: Uint8Array, tempName: string): Promise<void> {
  try {
    await ops.write(tempName, bytes);
    await ops.moveOver(tempName, name);
  } catch (error) {
    // Best effort: the temp file is only a leftover, and the original error matters more.
    await ops.remove(tempName).catch(() => {});
    throw error;
  }
}
