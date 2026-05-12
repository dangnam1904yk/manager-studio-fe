import toast from "../components/share/ToastMessage";
import { notification } from "antd";
import { AxiosError } from "axios";

class HttpError {
  private ERROR_CODE: Record<string, string> = {
    common: "Lỗi chung",
    forbidden: "Bạn không có quyền truy cập tài nguyên này.",
    err_network: "Lỗi kết nối mạng. Vui lòng kiểm tra Internet.",
    unexpected_error: "Đã xảy ra lỗi hệ thống.",
    unauthorized: "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại."
  };

  public unwrap = (error: AxiosError) => {
    const { code, response } = error;

    if (code === AxiosError.ERR_NETWORK) {
      this.showNotification("Lỗi mạng", this.ERROR_CODE.err_network);
    } else if (response) {
      const { status, data } = response;

      switch (status) {
        case 403:
          this.showNotification("403 - Cấm truy cập", this.ERROR_CODE.forbidden);
          break;
        case 404:
          this.showNotification("404 - Không tìm thấy", "Tài nguyên bạn yêu cầu không tồn tại.");
          break;
        case 401:
          this.showNotification("401 - Không xác thực", this.ERROR_CODE.unauthorized);
          // TODO: logout tự động nếu cần
          break;
        default:
          if (data && typeof data === "object" && "detail" in data && data?.detail != null) {
            const errorMessage = (data["detail"] || "").toString().trim();
            if (errorMessage) {
              this.showNotification("Lỗi", errorMessage);
            } else {
              this.showNotification("Lỗi không xác định", this.ERROR_CODE.unexpected_error);
            }
          } else if (data && typeof data === "object" && "error" in data) {
            const errorMessage = (data["error"] || "").toString().trim();
            if (errorMessage) {
              this.showNotification("Lỗi", errorMessage);
            } else {
              this.showNotification("Lỗi không xác định", this.ERROR_CODE.unexpected_error);
            }
          }

          break;
      }
    }

    return Promise.reject(error);
  };

  private showNotification = (title: string, description: string) => {
    toast.error(description);
  };
}

export default new HttpError();
