import { LoadingOutlined } from "@ant-design/icons";
import { Spin, Progress } from "antd";
import "./LoadingOverlay.css";

const LoadingOverlay = ({
  visible = false,
  status = "Loading...",
  progress = 0,
  showProgress = true,
}: {
  visible?: boolean;
  status?: string;
  progress?: number;
  showProgress?: boolean;
}) => {
  if (!visible) return null;

  return (
    <div className="loading-overlay">
      <div className="loading-overlay-content">
        <Spin indicator={<LoadingOutlined className="loading-overlay-spinner" spin />} />
        <div className="loading-overlay-status">{status}</div>
        {showProgress && (
          <Progress
            percent={progress}
            status="active"
            // Ant Design's progress gradient is only available through this API.
            strokeColor={{
              "0%": "#98BDD2",
              "100%": "#6aa4c3",
            }}
            className="loading-overlay-progress"
          />
        )}
      </div>
    </div>
  );
};

export default LoadingOverlay;
