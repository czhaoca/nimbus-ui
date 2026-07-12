import { UsersPage } from "@/features/users/UsersPage";

// Thin route wrapper (#42, GAP-001 material-touch migration): the
// implementation lives in the feature module.
export default function UsersRoutePage() {
  return <UsersPage />;
}
