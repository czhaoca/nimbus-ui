import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { User } from "../types";

const { listUsersMock, createUserMock, updateUserMock, deleteUserMock } =
  vi.hoisted(() => ({
    listUsersMock: vi.fn(),
    createUserMock: vi.fn(),
    updateUserMock: vi.fn(),
    deleteUserMock: vi.fn(),
  }));

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  listUsers: listUsersMock,
  createUser: createUserMock,
  updateUser: updateUserMock,
  deleteUser: deleteUserMock,
}));

import { UsersPage } from "../UsersPage";

// UserOut fixtures — the alias itself forbids the phantom creation-time
// field (#42/GAP-004).
const USERS: User[] = [
  {
    id: "u-1",
    username: "unit-admin",
    email: "admin@unit.test",
    role: "admin",
    is_active: true,
  },
  {
    id: "u-2",
    username: "unit-viewer",
    email: null,
    role: "viewer",
    is_active: false,
  },
];

describe("UsersPage", () => {
  beforeEach(() => {
    listUsersMock.mockResolvedValue(USERS);
  });

  afterEach(() => {
    // RTL auto-cleanup needs test.globals; with explicit vitest imports the
    // unmount must be manual or mounted trees leak across tests.
    cleanup();
    vi.clearAllMocks();
  });

  it("renders only contract-real columns — no Created, no Invalid Date", async () => {
    render(<UsersPage />);

    expect(await screen.findByText("unit-admin")).toBeDefined();
    for (const header of ["Username", "Email", "Role", "Status", "Actions"]) {
      expect(screen.getByText(header)).toBeDefined();
    }
    // The phantom creation-time column is gone (GAP-004): no header, no value.
    expect(screen.queryByText("Created")).toBeNull();
    expect(screen.queryByText(/invalid date/i)).toBeNull();
    // is_active renders as the honest badge pair.
    expect(screen.getByText("active")).toBeDefined();
    expect(screen.getByText("disabled")).toBeDefined();
    // Null email renders the explicit em-dash unknown state.
    expect(screen.getByText("—")).toBeDefined();
  });

  it("create flow posts the typed body and refetches the list", async () => {
    createUserMock.mockResolvedValue(USERS[1]);
    const user = userEvent.setup();
    render(<UsersPage />);
    await screen.findByText("unit-admin");

    await user.click(screen.getByRole("button", { name: "Add User" }));
    await user.type(screen.getByLabelText("Username"), "unit-new");
    await user.type(screen.getByLabelText("Password"), "pw-unit-1");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(createUserMock).toHaveBeenCalledWith({
        username: "unit-new",
        email: null,
        password: "pw-unit-1",
        role: "viewer",
      }),
    );
    expect(listUsersMock).toHaveBeenCalledTimes(2);
    expect(await screen.findByText("User created successfully")).toBeDefined();
  });

  it("surfaces the listUsers error string honestly", async () => {
    listUsersMock.mockRejectedValue(new Error("users-boom"));
    render(<UsersPage />);

    expect(await screen.findByText("users-boom")).toBeDefined();
  });
});
