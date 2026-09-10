export interface User {
  id: number;
  name: string;
  handle: string;
  color: string;
}

export const USERS: User[] = [
  { id: 1, name: "Oleg", handle: "@oleg", color: "#6ab2f2" },
  { id: 2, name: "Kirill", handle: "@kirill", color: "#e17076" },
];
