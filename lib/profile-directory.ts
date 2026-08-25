import { supabase } from "@/lib/supabase";

export type ArivoDirectoryUser = {
  username: string | null;
  avatar: string | null;
  wallet: string | null;
  arivo_id: string | null;
};

function mapProfile(row: {
  username?: string | null;
  avatar?: string | null;
  wallet?: string | null;
  arivo_id?: string | null;
}): ArivoDirectoryUser {
  return {
    username: row.username ?? null,
    avatar: row.avatar ?? null,
    wallet: row.wallet ?? null,
    arivo_id: row.arivo_id ?? null,
  };
}

export async function getArivoUsers(
  ownerWallet?: string,
  query?: string
): Promise<ArivoDirectoryUser[]> {
  try {
    let request = supabase
      .from("profiles")
      .select("username, avatar, wallet, arivo_id")
      .limit(12);

    if (ownerWallet) {
      request = request.neq(
        "wallet",
        ownerWallet.toLowerCase()
      );
    }

    const cleanQuery = query?.trim();

    if (cleanQuery) {
      const pattern = `%${cleanQuery}%`;
      request = request.or(
        `username.ilike.${pattern},arivo_id.ilike.${pattern}`
      );
    }

    const { data, error } = await request;

    if (error) {
      console.warn(
        "Arivo directory unavailable:",
        error.message
      );
      return [];
    }

    return (data ?? [])
      .map(mapProfile)
      .filter(
        (profile) =>
          Boolean(profile.wallet) &&
          Boolean(profile.username || profile.arivo_id)
      );
  } catch (error) {
    console.warn("Arivo directory lookup failed:", error);
    return [];
  }
}
