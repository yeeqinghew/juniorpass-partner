import { Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import "./Spinner.css";

const Spinner = () => {
  return (
    <div className="partner-spinner">
      <Spin
        indicator={<LoadingOutlined className="partner-spinner-icon" spin />}
      ></Spin>
    </div>
  );
};

export default Spinner;
