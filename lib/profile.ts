import { supabase } from "./supabase";

export type UserProfile = {
  id?: string;
  wallet: string;
  username: string;
  avatar: string;
  arivo_id?: string;
  created_at?: string;
};

/* -------------------------------- */
/* Generate Arivo ID                 */
/* -------------------------------- */

function generateArivoId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let part1 = "";
  let part2 = "";

  for (let i = 0; i < 4; i++) {
    part1 += chars[Math.floor(Math.random() * chars.length)];
    part2 += chars[Math.floor(Math.random() * chars.length)];
  }

  return `ARV-${part1}-${part2}`;
}

/* -------------------------------- */
/* Get Profile                      */
/* -------------------------------- */

export async function getProfile(wallet: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("wallet", wallet)
    .maybeSingle();

  if (error) {
    alert(
      "GET PROFILE ERROR\n\n" +
        JSON.stringify(error, null, 2)
    );

    return null;
  }

  if (!data) {
    return null;
  }

  /*
   * Existing profiles may not have an Arivo ID yet.
   * Generate one automatically.
   */

  if (!data.arivo_id) {
    let newArivoId = generateArivoId();

    let attempts = 0;

    while (attempts < 5) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("arivo_id", newArivoId)
        .maybeSingle();

      if (!existing) {
        break;
      }

      newArivoId = generateArivoId();
      attempts++;
    }

    const { data: updatedProfile, error: updateError } =
      await supabase
        .from("profiles")
        .update({
          arivo_id: newArivoId,
        })
        .eq("wallet", wallet)
        .select()
        .maybeSingle();

    if (updateError) {
      console.error(
        "ARIVO ID UPDATE ERROR:",
        updateError
      );

      return data as UserProfile;
    }

    return updatedProfile as UserProfile;
  }

  return data as UserProfile;
}

/* -------------------------------- */
/* Create Profile                   */
/* -------------------------------- */

export async function createProfile(
  wallet: string,
  username: string,
  avatar: string
) {
  let arivoId = generateArivoId();

  let attempts = 0;

  while (attempts < 5) {
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("arivo_id", arivoId)
      .maybeSingle();

    if (!existing) {
      break;
    }

    arivoId = generateArivoId();
    attempts++;
  }

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      wallet,
      username,
      avatar,
      arivo_id: arivoId,
    })
    .select()
    .maybeSingle();

  if (error) {
    alert(
      "CREATE PROFILE ERROR\n\n" +
        JSON.stringify(error, null, 2)
    );

    throw error;
  }

  return data as UserProfile;
}

/* -------------------------------- */
/* Username Exists                  */
/* -------------------------------- */

export async function usernameExists(
  username: string
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username);

  if (error) {
    alert(
      "USERNAME ERROR\n\n" +
        JSON.stringify(error, null, 2)
    );

    return false;
  }

  return (data?.length ?? 0) > 0;
}

/* -------------------------------- */
/* Update Avatar                    */
/* -------------------------------- */

export async function updateAvatar(
  wallet: string,
  avatar: string
) {
  const { error } = await supabase
    .from("profiles")
    .update({
      avatar,
    })
    .eq("wallet", wallet);

  if (error) {
    alert(
      "UPDATE AVATAR ERROR\n\n" +
        JSON.stringify(error, null, 2)
    );

    throw error;
  }
}

/* -------------------------------- */
/* Update Username                  */
/* -------------------------------- */

export async function updateUsername(
  wallet: string,
  username: string
) {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      username: "@" + username,
    })
    .eq("wallet", wallet)
    .select()
    .maybeSingle();

  if (error) {
    alert(
      "UPDATE USERNAME ERROR\n\n" +
        JSON.stringify(error, null, 2)
    );

    throw error;
  }

  return data as UserProfile;
}
export async function getProfileByArivoId(arivoId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("arivo_id", arivoId.trim().toUpperCase())
    .maybeSingle();

  if (error) {
    console.error("ARIVO ID LOOKUP ERROR:", error);
    return null;
  }

  return data as UserProfile | null;
}