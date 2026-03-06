import type { ScenarioData } from "../types";
import { restaurantData } from "./restaurant";
import { retailData } from "./retail";
import { multichannelData } from "./multichannel";
import { servicesData } from "./services";

export const scenarios: Record<string, ScenarioData> = {
  restaurant: restaurantData,
  retail: retailData,
  multichannel: multichannelData,
  services: servicesData,
};
