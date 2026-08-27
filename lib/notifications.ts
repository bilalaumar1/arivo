import { supabase } from "@/lib/supabase";

export type NotificationRow = {
  id: string;
  recipient_address: string;
  type: string;
  title: string;
  message: string;
  transaction_hash: string | null;
  asset: string | null;
  amount: number | null;
  sender_address: string | null;
  is_read: boolean;
  created_at: string;
};

type CreateNotificationInput = {
  recipientAddress: string;
  type: string;
  title: string;
  message: string;
  transactionHash?: string;
  asset?: string;
  amount?: number;
  senderAddress?: string;
};

export async function createNotification(
  input: CreateNotificationInput
) {
  const recipientAddress =
    input.recipientAddress.toLowerCase();

  /*
   * Prevent duplicate notifications for the
   * same blockchain transaction.
   */
  if (input.transactionHash) {
    const { data: existing, error: existingError } =
      await supabase
        .from("notifications")
        .select("id")
        .eq(
          "recipient_address",
          recipientAddress
        )
        .eq(
          "transaction_hash",
          input.transactionHash
        )
        .eq("type", input.type)
        .maybeSingle();

    if (existingError) {
      console.error(
        "Failed to check existing notification:",
        existingError
      );
    }

    if (existing) {
      return existing;
    }
  }

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      recipient_address: recipientAddress,
      type: input.type,
      title: input.title,
      message: input.message,
      transaction_hash:
        input.transactionHash ?? null,
      asset: input.asset ?? null,
      amount:
        typeof input.amount === "number"
          ? input.amount
          : null,
      sender_address:
        input.senderAddress?.toLowerCase() ?? null,
      is_read: false,
    })
    .select()
    .single();

  if (error) {
    console.error(
      "Failed to create notification:",
      error
    );

    return null;
  }

  return data as NotificationRow;
}

export async function getNotifications(
  recipientAddress: string
) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq(
      "recipient_address",
      recipientAddress.toLowerCase()
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(30);

  if (error) {
    console.error(
      "Failed to load notifications:",
      error
    );

    return [];
  }

  return (data ?? []) as NotificationRow[];
}

export async function markNotificationAsRead(
  id: string
) {
  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
    })
    .eq("id", id);

  if (error) {
    console.error(
      "Failed to mark notification as read:",
      error
    );

    return false;
  }

  return true;
}

export async function markAllNotificationsAsRead(
  recipientAddress: string
) {
  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
    })
    .eq(
      "recipient_address",
      recipientAddress.toLowerCase()
    )
    .eq("is_read", false);

  if (error) {
    console.error(
      "Failed to mark all notifications as read:",
      error
    );

    return false;
  }

  return true;
}