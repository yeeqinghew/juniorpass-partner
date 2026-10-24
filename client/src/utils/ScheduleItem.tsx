/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck -- Legacy Ant Design dynamic-form model migration boundary.
import { Form, Select, InputNumber, Row, Col } from "antd";
import { MinusCircleOutlined } from "@ant-design/icons";
import TimeRangePicker from "./TimeRangePicker";
import day from "../data/day.json";
import frequency from "../data/frequency.json";

const ScheduleItem = ({ field, remove }) => (
  <Row gutter={[16, 16]} align="middle">
    <Col xs={24} sm={5}>
      <Form.Item
        name={[field.name, "day"]}
        rules={[{ required: true, message: "Please select a day" }]}
        style={{ marginBottom: 0 }}
      >
        <Select placeholder="Select day">
          {day.map((d) => (
            <Select.Option key={d} value={d}>
              {d}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
    </Col>

    <Col xs={24} sm={6}>
      <Form.Item
        name={[field.name, "timeslot"]}
        rules={[{ required: true, message: "Please select a timeslot" }]}
        style={{ marginBottom: 0 }}
      >
        <TimeRangePicker />
      </Form.Item>
    </Col>

    <Col xs={24} sm={4}>
      <Form.Item
        name={[field.name, "frequency"]}
        rules={[{ required: true, message: "Please select frequency" }]}
        style={{ marginBottom: 0 }}
      >
        <Select
          placeholder="Frequency"
          options={frequency.map((freq) => ({ value: freq, label: freq }))}
        />
      </Form.Item>
    </Col>

    <Col xs={24} sm={3}>
      <Form.Item
        name={[field.name, "slots"]}
        rules={[
          { required: true, message: "Required" },
          { 
            type: 'number', 
            min: 1, 
            max: 100, 
            message: "1-100" 
          }
        ]}
        style={{ marginBottom: 0 }}
      >
        <InputNumber
          placeholder="Slots"
          min={1}
          max={100}
          style={{ width: "100%" }}
        />
      </Form.Item>
    </Col>

    <Col xs={24} sm={3}>
      <Form.Item
        name={[field.name, "credit"]}
        rules={[
          { required: true, message: "Required" },
          { 
            type: 'number', 
            min: 1, 
            max: 10, 
            message: "1-10" 
          }
        ]}
        style={{ marginBottom: 0 }}
      >
        <InputNumber
          placeholder="Credits"
          min={1}
          max={10}
          style={{ width: "100%" }}
        />
      </Form.Item>
    </Col>

    <Col xs={24} sm={3} style={{ textAlign: "center" }}>
      <MinusCircleOutlined
        onClick={() => remove(field.name)}
        style={{ 
          color: "#ff4d4f", 
          fontSize: "20px", 
          cursor: "pointer",
          transition: "all 0.3s ease"
        }}
        onMouseEnter={(e) => e.target.style.transform = "scale(1.2)"}
        onMouseLeave={(e) => e.target.style.transform = "scale(1)"}
      />
    </Col>
  </Row>
);

export default ScheduleItem;
