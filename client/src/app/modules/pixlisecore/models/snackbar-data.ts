export type SnackbarType = "warning" | "error" | "info" | "success";

export type SnackbarDataItem = {
  message: string;
  details: string;
  action: string;
  type: SnackbarType;
  timestamp: number;
};