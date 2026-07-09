export interface Nation {
  id: string;
  name: string;
  color: string; // crest / map color
  capitalProvinceId: string;
  provinceIds: string[]; // provinces this nation controls
  blurb: string; // short flavor text for the start screen
}
