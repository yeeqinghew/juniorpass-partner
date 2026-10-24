import { useState } from "react";
import _ from "lodash";

export type AddressResult = {
  ADDRESS: string;
  [key: string]: unknown;
};

const useAddressSearch = (debounceTime = 300) => {
  const [addressData, setAddressData] = useState<AddressResult[]>([]);

  const handleAddressSearch = _.debounce(async (value: string) => {
    if (value) {
      const response = await fetch(
        `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${value}&returnGeom=Y&getAddrDetails=Y&pageNum=`
      );
      const parseRes = (await response.json()) as { results?: AddressResult[] };
      setAddressData(parseRes.results ?? []);
    }
  }, debounceTime);

  return { addressData, handleAddressSearch };
};

export default useAddressSearch;
