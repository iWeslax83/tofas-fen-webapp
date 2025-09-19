export const getUserRolePath = (userRole: string): string => {
  switch (userRole) {
    case "admin":
      return "/admin";
    case "hizmetli":
      return "/hizmetli";
    case "teacher":
      return "/teacher";
    case "parent":
      return "/parent";
    case "student":
      return "/student";
    default:
      return "/login";
  }
}; 