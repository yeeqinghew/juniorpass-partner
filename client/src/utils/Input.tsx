import { Form, Input } from "antd";
import type { ReactNode } from "react";

type CustomInputProps = {
  name: string;
  required?: boolean;
  placeholder?: string;
  prefixIcon?: ReactNode;
};

const CustomInput = ({ name, required, placeholder, prefixIcon }: CustomInputProps) => {
  return (
    <Form.Item
      name={name}
      rules={[
        {
          required: required,
          message: `Please input your ${name}`,
        },
      ]}
    >
      <Input
        prefix={prefixIcon}
        placeholder={placeholder}
        size={"large"}
        required
      />
    </Form.Item>
  );
};

export default CustomInput;
