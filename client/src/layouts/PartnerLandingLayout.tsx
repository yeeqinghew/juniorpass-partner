import { ConfigProvider } from "antd";
import { Outlet } from "react-router-dom";

const PartnerLayout = () => {
  return (
    <ConfigProvider
      // Ant Design's theme system requires a JavaScript token object.
      theme={{
        token: {
          colorPrimary: "#98BDD2",
          colorPrimaryActive: "#6aa4c3",
          colorInfo: "#98BDD2",
          colorSuccess: "#52c41a",
          colorWarning: "#faad14",
          colorText: "#333333",
          colorTextSecondary: "#666666",
          colorBorder: "#f0f0f0",
          colorBgContainer: "#ffffff",
          colorBgLayout: "#FCFBF8",
          borderRadius: 10,
          controlHeight: 40,
          fontSize: 13,
          fontFamily:
            "Poppins, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        },
        components: {
          Layout: {
            headerBg: "#ffffff",
            bodyBg: "#FCFBF8",
            lightSiderBg: "#ffffff",
            siderBg: "#ffffff",
          },
          Menu: {
            itemBorderRadius: 11,
            itemSelectedBg: "#98BDD2",
            itemSelectedColor: "#ffffff",
          },
          Tabs: {
            itemActiveColor: "#6aa4c3",
            itemHoverColor: "#6aa4c3",
            itemSelectedColor: "#6aa4c3",
            inkBarColor: "#98BDD2",
          },
          Button: {
            primaryShadow: "none",
            borderRadius: 10,
          },
          Card: {
            borderRadiusLG: 17,
          },
        },
      }}
    >
      <div className="partner-app-root">
        <Outlet />
      </div>
    </ConfigProvider>
  );
};

export default PartnerLayout;
