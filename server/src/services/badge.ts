import { env, flags } from '../config/env';
import { createLogger } from '../lib/logger';

const log = createLogger('badge');

/**
 * Solana devnet "Passion Points" badge minting (STRETCH, feature-flagged).
 *
 * When FEATURE_SOLANA is on and a server mint keypair + recipient wallet are
 * present, this mints a real SPL token on devnet, verifiable on Solana
 * Explorer. Otherwise it returns a clearly-labelled SIMULATED badge so the
 * engagement loop (streaks, votes, bracket wins) still awards something and a
 * broken wallet integration never takes down the demo.
 *
 * @solana/* are optionalDependencies loaded via dynamic import; the specifier
 * is cast to string so typecheck doesn't require the packages to be installed.
 */

export interface BadgeResult {
  label: string;
  reason: string;
  mint: string;
  txSignature: string | null;
  explorerUrl: string | null;
  simulated: boolean;
  awardedAt: string;
}

export interface MintArgs {
  label: string;
  reason: string;
  recipientWallet?: string | null;
}

/** Deterministic pseudo-base58 id for simulated mints. */
function fakeMintId(seed: string): string {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = (h * 33) ^ seed.charCodeAt(i);
  let out = 'FANF';
  let x = Math.abs(h);
  for (let i = 0; i < 36; i++) {
    out += alphabet[x % alphabet.length];
    x = Math.floor(x / 7) + ((x * 31 + i) % 97);
  }
  return out.slice(0, 44);
}

function simulated(args: MintArgs, awardedAt: string): BadgeResult {
  return {
    label: args.label,
    reason: args.reason,
    mint: fakeMintId(`${args.label}:${args.reason}:${args.recipientWallet ?? 'anon'}:${awardedAt}`),
    txSignature: null,
    explorerUrl: null,
    simulated: true,
    awardedAt,
  };
}

export async function mintBadge(args: MintArgs): Promise<BadgeResult> {
  const awardedAt = new Date().toISOString();

  if (!flags.solana || !args.recipientWallet) {
    return simulated(args, awardedAt);
  }

  try {
    // Cast specifiers to string to keep these out of static type resolution.
    const web3 = (await import('@solana/web3.js' as string)) as any;
    const splToken = (await import('@solana/spl-token' as string)) as any;
    const bs58 = ((await import('bs58' as string)) as any).default ?? (await import('bs58' as string));

    const connection = new web3.Connection(env.solanaRpc, 'confirmed');
    const payer = web3.Keypair.fromSecretKey(bs58.decode(env.solanaMintSecret));
    const recipient = new web3.PublicKey(args.recipientWallet);

    // 0-decimal SPL token = a badge. Mint 1 to the fan's wallet.
    const mint = await splToken.createMint(connection, payer, payer.publicKey, null, 0);
    const ata = await splToken.getOrCreateAssociatedTokenAccount(connection, payer, mint, recipient);
    const sig = await splToken.mintTo(connection, payer, mint, ata.address, payer, 1);

    const mintStr = mint.toBase58();
    log.info(`minted Passion Points badge ${mintStr} to ${args.recipientWallet}`);
    return {
      label: args.label,
      reason: args.reason,
      mint: mintStr,
      txSignature: String(sig),
      explorerUrl: `https://explorer.solana.com/address/${mintStr}?cluster=devnet`,
      simulated: false,
      awardedAt,
    };
  } catch (err) {
    log.warn('Solana mint failed, returning simulated badge', (err as Error).message);
    return simulated(args, awardedAt);
  }
}
