const STORAGE_PREFIX = "arivo:contacts:";

export type ArivoContact = {
  id: string;
  ownerWallet: string;
  name: string;
  walletAddress: string;
  note: string;
  arivoId: string;
  avatarUrl: string;
  favorite: boolean;
  createdAt: string;
};

function storageKey(ownerWallet: string) {
  return `${STORAGE_PREFIX}${ownerWallet.toLowerCase()}`;
}

function makeId() {
  if (
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export function getContacts(
  ownerWallet: string
): ArivoContact[] {
  if (
    typeof window === "undefined" ||
    !ownerWallet
  ) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(
      storageKey(ownerWallet)
    );

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed.map((item) => ({
      ...item,
      arivoId: item.arivoId ?? "",
      avatarUrl: item.avatarUrl ?? "",
      note: item.note ?? "",
      favorite: Boolean(item.favorite),
    })) as ArivoContact[];
  } catch (error) {
    console.error(
      "Failed to load contacts:",
      error
    );

    return [];
  }
}

function saveContacts(
  ownerWallet: string,
  contacts: ArivoContact[]
) {
  if (
    typeof window === "undefined" ||
    !ownerWallet
  ) {
    return;
  }

  window.localStorage.setItem(
    storageKey(ownerWallet),
    JSON.stringify(contacts)
  );
}

export function createContact(
  ownerWallet: string,
  input: {
    name: string;
    walletAddress: string;
    note?: string;
    arivoId?: string;
    avatarUrl?: string;
  }
) {
  if (!ownerWallet) {
    throw new Error(
      "Connect your Arivo wallet first."
    );
  }

  const existing = getContacts(ownerWallet);

  if (
    existing.some(
      (contact) =>
        contact.walletAddress.toLowerCase() ===
        input.walletAddress
          .trim()
          .toLowerCase()
    )
  ) {
    throw new Error(
      "This recipient is already saved."
    );
  }

  const contact: ArivoContact = {
    id: makeId(),
    ownerWallet: ownerWallet.toLowerCase(),
    name: input.name.trim(),
    walletAddress:
      input.walletAddress.trim(),
    note: input.note?.trim() ?? "",
    arivoId:
      input.arivoId
        ?.trim()
        .toUpperCase() ?? "",
    avatarUrl:
      input.avatarUrl?.trim() ?? "",
    favorite: false,
    createdAt: new Date().toISOString(),
  };

  saveContacts(ownerWallet, [
    contact,
    ...existing,
  ]);

  return contact;
}

/**
 * Update a saved contact when the real
 * Arivo profile changes.
 *
 * This does NOT create a new contact.
 * It only updates the existing saved one.
 */
export function updateContactProfile(
  ownerWallet: string,
  walletAddress: string,
  profile: {
    username?: string | null;
    avatar?: string | null;
    arivo_id?: string | null;
  }
) {
  if (!ownerWallet || !walletAddress) {
    return getContacts(ownerWallet);
  }

  const normalizedWallet =
    walletAddress.trim().toLowerCase();

  const contacts =
    getContacts(ownerWallet);

  let changed = false;

  const updatedContacts = contacts.map(
    (contact) => {
      if (
        contact.walletAddress
          .trim()
          .toLowerCase() !==
        normalizedWallet
      ) {
        return contact;
      }

      changed = true;

      return {
        ...contact,

        name:
          profile.username?.trim() ||
          contact.name,

        avatarUrl:
          profile.avatar?.trim() ??
          contact.avatarUrl,

        arivoId:
          profile.arivo_id
            ?.trim()
            .toUpperCase() ||
          contact.arivoId,
      };
    }
  );

  if (changed) {
    saveContacts(
      ownerWallet,
      updatedContacts
    );
  }

  return updatedContacts;
}

export function updateContactAvatar(
  ownerWallet: string,
  id: string,
  avatarUrl: string
) {
  const contacts =
    getContacts(ownerWallet).map(
      (contact) =>
        contact.id === id
          ? {
              ...contact,
              avatarUrl:
                avatarUrl.trim(),
            }
          : contact
    );

  saveContacts(ownerWallet, contacts);

  return contacts;
}

export function toggleContactFavorite(
  ownerWallet: string,
  id: string
) {
  const contacts =
    getContacts(ownerWallet).map(
      (contact) =>
        contact.id === id
          ? {
              ...contact,
              favorite:
                !contact.favorite,
            }
          : contact
    );

  saveContacts(ownerWallet, contacts);

  return contacts;
}

export function deleteContact(
  ownerWallet: string,
  id: string
) {
  const contacts =
    getContacts(ownerWallet).filter(
      (contact) =>
        contact.id !== id
    );

  saveContacts(ownerWallet, contacts);

  return contacts;
}