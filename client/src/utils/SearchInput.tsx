import { Select } from "antd";
import { useState } from "react";
import type { CSSProperties } from "react";

type AddressResult = {
  ADDRESS: string;
  [key: string]: unknown;
};

type AddressOption = {
  value: string;
  label: string;
  valueObject: AddressResult;
};

type SearchInputProps = {
  placeholder?: string;
  addressValue?: AddressResult;
  setAddressValue: (address: AddressResult) => void;
  style?: CSSProperties;
  setFieldValue: (field: string, value: AddressResult) => void;
};

const SearchInput = (props: SearchInputProps) => {
  const { placeholder, addressValue, setAddressValue, style, setFieldValue } =
    props;
  const [data, setData] = useState<AddressResult[]>([]);

  const handleSearch = async (value: string) => {
    const response = await fetch(
      `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${value}&returnGeom=Y&getAddrDetails=Y&pageNum=`
    );
    const parseRes = (await response.json()) as { results?: AddressResult[] };
    setData(parseRes.results ?? []);
  };

  const handleChange = (
    _newValue: string,
    selectedGG?: AddressOption | AddressOption[],
  ) => {
    if (!selectedGG || Array.isArray(selectedGG)) return;
    setAddressValue(selectedGG.valueObject);
    setFieldValue("address", selectedGG.valueObject);
  };

  return (
    <Select
      showSearch
      value={addressValue?.ADDRESS}
      placeholder={placeholder}
      style={style}
      filterOption={false}
      onSearch={handleSearch}
      onChange={handleChange}
      notFoundContent={null}
      options={(data || []).map((d) => ({
        value: d.ADDRESS,
        label: d.ADDRESS,
        valueObject: d,
      }))}
    />
  );
};

export default SearchInput;
