import { TimePicker } from "antd";
import dayjs from "dayjs";
import "./TimeRangePicker.css";

const { RangePicker } = TimePicker;

const TimeRangePicker = ({ value = [], onChange, disabled = false }) => {
  const formattedValues = value.length
    ? value.map((time) => (dayjs.isDayjs(time) ? time : dayjs(time, "HH:mm")))
    : [];

  const handleChange = (values) => {
    if (values) {
      onChange(values.map((time) => time.format("HH:mm")));
    } else {
      onChange([]);
    }
  };

  return (
    <RangePicker
      format="HH:mm"
      value={formattedValues}
      onChange={handleChange}
      className="time-range-picker"
      popupClassName="time-range-picker-popup"
      size="large"
      minuteStep={15}
      disabled={disabled}
    />
  );
};

export default TimeRangePicker;
