export const AUTHORITY_CHAIN = [
  "Jon Denham",
  "Alison Denham",
  "Family Authority",
  "Administrator",
  "User",
];

export const ROLES = {
  OWNER: "OWNER",
  CO_OWNER: "CO_OWNER",
  FAMILY_ADMIN: "FAMILY_ADMIN",
  ADMIN: "ADMIN",
  USER: "USER",
};

export function hasAuthority(
  currentRole: string,
  requiredRole: string
) {
  const levels = {
    OWNER: 5,
    CO_OWNER: 4,
    FAMILY_ADMIN: 3,
    ADMIN: 2,
    USER: 1,
  };

  return (
    levels[currentRole as keyof typeof levels] >=
    levels[requiredRole as keyof typeof levels]
  );
}
