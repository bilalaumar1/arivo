import { supabase } from "@/lib/supabase";

export type ChatMessage = {
  id: string;
  sender: "me" | "contact";
  text: string;
  createdAt: string;
};

type ChatMessageRow = {
  id: string;
  conversation_key: string;
  sender_wallet: string;
  receiver_wallet: string;
  body: string;
  created_at: string;
};

function normalizeWallet(wallet: string) {
  return wallet.trim().toLowerCase();
}

function getParticipantPair(walletA: string, walletB: string) {
  const a = normalizeWallet(walletA);
  const b = normalizeWallet(walletB);

  return a < b ? [a, b] : [b, a];
}

function getConversationKey(walletA: string, walletB: string) {
  const [participantA, participantB] = getParticipantPair(walletA, walletB);

  return `${participantA}:${participantB}`;
}

function mapRow(
  row: ChatMessageRow,
  currentWallet: string
): ChatMessage {
  return {
    id: row.id,
    sender:
      normalizeWallet(row.sender_wallet) ===
      normalizeWallet(currentWallet)
        ? "me"
        : "contact",
    text: row.body,
    createdAt: row.created_at,
  };
}

async function getOrCreateConversation(
  walletA: string,
  walletB: string
) {
  const [participantA, participantB] =
    getParticipantPair(walletA, walletB);

  const conversationKey = getConversationKey(
    walletA,
    walletB
  );

  const { data: existing, error: findError } = await supabase
    .from("chat_conversations")
    .select("id")
    .eq("participant_a", participantA)
    .eq("participant_b", participantB)
    .maybeSingle();

  if (findError) {
    throw new Error(findError.message);
  }

  if (existing?.id) {
    return conversationKey;
  }

  const { error: createError } = await supabase
    .from("chat_conversations")
    .insert({
      participant_a: participantA,
      participant_b: participantB,
    });

  if (createError) {
    // Another request may have created the conversation first.
    const { data: raceWinner, error: raceError } = await supabase
      .from("chat_conversations")
      .select("id")
      .eq("participant_a", participantA)
      .eq("participant_b", participantB)
      .maybeSingle();

    if (raceError) {
      throw new Error(createError.message);
    }

    if (!raceWinner?.id) {
      throw new Error(createError.message);
    }
  }

  return conversationKey;
}

export async function getChatMessages(
  walletAddress: string,
  contactWallet: string
): Promise<ChatMessage[]> {
  const conversationKey = await getOrCreateConversation(
    walletAddress,
    contactWallet
  );

  const { data, error } = await supabase
    .from("chat_messages")
    .select(
      "id, conversation_key, sender_wallet, receiver_wallet, body, created_at"
    )
    .eq("conversation_key", conversationKey)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ChatMessageRow[]).map((row) =>
    mapRow(row, walletAddress)
  );
}

export async function sendChatMessage(
  senderWallet: string,
  receiverWallet: string,
  text: string
): Promise<ChatMessage> {
  const cleanText = text.trim();

  if (!cleanText) {
    throw new Error("Message cannot be empty.");
  }

  if (!senderWallet || !receiverWallet) {
    throw new Error("Both wallets are required.");
  }

  const conversationKey = await getOrCreateConversation(
    senderWallet,
    receiverWallet
  );

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      conversation_key: conversationKey,
      sender_wallet: normalizeWallet(senderWallet),
      receiver_wallet: normalizeWallet(receiverWallet),
      body: cleanText,
    })
    .select(
      "id, conversation_key, sender_wallet, receiver_wallet, body, created_at"
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRow(data as ChatMessageRow, senderWallet);
}

export function subscribeToConversation(
  walletAddress: string,
  contactWallet: string,
  onMessage: (message: ChatMessage) => void
) {
  let active = true;
  let channel: ReturnType<typeof supabase.channel> | null = null;

  const conversationKey = getConversationKey(
    walletAddress,
    contactWallet
  );

  void getOrCreateConversation(walletAddress, contactWallet)
    .then(() => {
      if (!active) return;

      channel = supabase
        .channel(`arivo-chat:${conversationKey}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `conversation_key=eq.${conversationKey}`,
          },
          (payload) => {
            onMessage(
              mapRow(
                payload.new as ChatMessageRow,
                walletAddress
              )
            );
          }
        )
        .subscribe();
    })
    .catch(() => {
      // Initial conversation loading errors are handled by the UI.
    });

  return () => {
    active = false;

    if (channel) {
      void supabase.removeChannel(channel);
    }
  };
}