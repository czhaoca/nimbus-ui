// Typed-client façade for the users module — all engine access stays on
// the /api/v1 contract client.
export {
  createUser,
  deleteUser,
  listUsers,
  updateUser,
} from "@/lib/api/client";
