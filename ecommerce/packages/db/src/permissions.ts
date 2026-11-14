// F6.2: OPERADOR não acessa equipe, configurações nem cobrança/plano. OWNER e ADMIN têm as mesmas
// permissões hoje — a distinção entre os dois é só nominal até existir algo concreto que só o OWNER
// deva fazer (ver Decisões da F6.2).
export type RoleKey = "OWNER" | "ADMIN" | "OPERADOR";
export type Permission = "settings" | "team" | "billing";

export function hasPermission(role: RoleKey, _permission: Permission): boolean {
  return role !== "OPERADOR";
}
