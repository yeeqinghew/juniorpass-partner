import { useMemo } from "react";
import * as mrtDataModule from "../data/mrt.json";
import LINE_COLORS from "../constant/mrtLineColors";
import { Tag } from "antd";

const useMRTStations = () => {
  const mrtData = Object.values(mrtDataModule) as Array<Record<string, unknown>>;
  const mrtStations = useMemo(() => {
    const stations: Record<string, string[]> = {};
    mrtData.forEach((mrt) => {
      const stationName = mrt["Station Name"];
      const stationCode = mrt["Station"];
      if (typeof stationName !== "string" || typeof stationCode !== "string") return;

      if (stations[stationName]) {
        stations[stationName].push(stationCode);
      } else {
        stations[stationName] = [stationCode];
      }
    });
    return stations;
  }, []);

  const renderTags = (stationCodes: string[]) => {
    return stationCodes.map((code) => {
      // Find matching color or use default
      const lineColor = (Object.keys(LINE_COLORS) as Array<keyof typeof LINE_COLORS>).find((key) =>
        code.includes(key)
      );
      return (
        <Tag color={lineColor ? LINE_COLORS[lineColor] : "#000"} key={code}>
          {code}
        </Tag>
      );
    });
  };

  return { mrtStations, renderTags };
};

export default useMRTStations;
