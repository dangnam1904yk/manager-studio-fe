import { notification } from "antd";
import { CheckCircleOutlined, ExclamationCircleOutlined } from "@ant-design/icons";

const toast = {
  success: (description: string) => {
    notification.open({
      message: (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 0" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              backgroundColor: "#16A34A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 2px 4px rgba(22, 163, 74, 0.2)"
            }}>
            <CheckCircleOutlined style={{ color: "white", fontSize: 20, display: "flex", alignItems: "center" }} />
          </div>
          <span style={{ color: "#15803D", fontSize: 14, fontWeight: 500, lineHeight: 1.5 }}>{description}</span>
        </div>
      ),
      placement: "topRight",
      duration: 4,
      style: {
        backgroundColor: "#F0FDF4",
        borderRadius: 12,
        padding: "16px 20px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
        border: "1px solid #BBF7D0"
      },
      icon: null,
      description: null
    });
  },

  warning: (description: string) => {
    notification.open({
      message: (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 0" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              backgroundColor: "#D97706",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 2px 4px rgba(217, 119, 6, 0.2)"
            }}>
            <ExclamationCircleOutlined
              style={{ color: "white", fontSize: 20, display: "flex", alignItems: "center" }}
            />
          </div>
          <span style={{ color: "#B45309", fontSize: 14, fontWeight: 500, lineHeight: 1.5 }}>{description}</span>
        </div>
      ),
      placement: "topRight",
      duration: 4,
      style: {
        backgroundColor: "#FFFBEB",
        borderRadius: 12,
        padding: "16px 20px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
        border: "1px solid #FDE68A"
      },
      icon: null,
      description: null
    });
  },

  error: (description: string) => {
    notification.open({
      message: (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 0" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              backgroundColor: "#DC2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 2px 4px rgba(220, 38, 38, 0.2)"
            }}>
            <ExclamationCircleOutlined
              style={{ color: "white", fontSize: 20, display: "flex", alignItems: "center" }}
            />
          </div>
          <span style={{ color: "#B91C1C", fontSize: 14, fontWeight: 500, lineHeight: 1.5 }}>{description}</span>
        </div>
      ),
      placement: "topRight",
      duration: 4,
      style: {
        backgroundColor: "#FEF2F2",
        borderRadius: 12,
        padding: "16px 20px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
        border: "1px solid #FECACA"
      },
      icon: null,
      description: null
    });
  }
};

export default toast;
