import { supabase } from "@/lib/supabase";

export type ArivoDirectoryUser = {
  username: string;
  avatar: string | null;
  wallet: string;
  arivo_id: string;
};

export async function searchArivoUsers(
  searchTerm: string,
  resultLimit = 6
): Promise<ArivoDirectoryUser[]> {
  const term = searchTerm.trim();

  if (term.length < 2) {
    return [];
  }

  const safeLimit = Math.min(Math.max(resultLimit, 1), 6);

  const { data, error } = await supabase.rpc("search_arivo_users", {
    search_term: term,
    result_limit: safeLimit,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ArivoDirectoryUser[];
}

export async function getArivoUserCount(): Promise<number> {
  const { data, error } = await supabase.rpc("get_arivo_user_count");

  if (error) {
    throw new Error(error.message);
  }

  return Number(data ?? 0);
}
