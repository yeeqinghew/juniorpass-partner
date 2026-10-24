import { useEffect } from "react";
import type { FormInstance } from "antd";
import type { Listing, ListingSchedule } from "../types/listing";

type OutletFormValue = {
  outlet_id: string | number;
  outlet_address?: string;
  nearest_mrt?: string;
  schedules: Array<Omit<ListingSchedule, "outlet_id" | "outlet_address" | "nearest_mrt">>;
};

const useFormInitialization = (form: FormInstance, list?: Listing | null) => {
  useEffect(() => {
    if (!list) return;

    // parse package
    const packageTypes = list?.package_types
      ? list?.package_types.replace(/{|}/g, "").split(",")
      : [];

    const ageGroups = list?.age_groups
      ? list?.age_groups.replace(/{|}/g, "").split(",")
      : [];

    const outlets = list?.schedule_info
      ? list.schedule_info?.reduce<OutletFormValue[]>((acc, schedule) => {
          const outletIndex = acc.findIndex(
            (o) => o.outlet_id === schedule.outlet_id,
          );

          const scheduleData = {
            day: schedule.day,
            timeslot: schedule.timeslot,
            frequency: schedule.frequency,
            slots: schedule.slots,
            credit: schedule.credit,
          };

          if (outletIndex === -1) {
            acc.push({
              outlet_id: schedule.outlet_id,
              outlet_address: schedule.outlet_address,
              nearest_mrt: schedule.nearest_mrt,
              schedules: [scheduleData],
            });
          } else {
            acc[outletIndex].schedules.push(scheduleData);
          }

          return acc;
        }, []) ?? []
      : [];

    // Initialize form values
    form.setFieldsValue({
      title: list?.listing_title,
      credit: list?.credit,
      description: list?.description,
      package_types: packageTypes,
      age_groups: ageGroups,
      outlets,
    });
  }, [form, list]);
};

export default useFormInitialization;
