import { TimePicker } from "antd";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import "./TimeRangePicker.css";

const { RangePicker } = TimePicker;

type TimeRangePickerProps = {
  value?: Array<string | Dayjs>;
  onChange: (value: string[]) => void;
  disabled?: boolean;
};

const TimeRangePicker = ({ value = [], onChange, disabled = false }: TimeRangePickerProps) => {
  const formattedValues: [Dayjs | null, Dayjs | null] = value.length === 2
    ? value.map((time) =>
        dayjs.isDayjs(time) ? time : dayjs(time, "HH:mm"),
      ) as [Dayjs, Dayjs]
    : [null, null];

  const handleChange = (values: [Dayjs | null, Dayjs | null] | null) => {
    if (values) {
      onChange(values.filter((time): time is Dayjs => Boolean(time)).map((time) => time.format("HH:mm")));
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
