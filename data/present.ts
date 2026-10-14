export const presentDaySignals = [
  ["14:02", "ANPR", "Tallinn, Peterburi tee", "12%"],
  ["14:31", "COMMUNICATION METADATA", "4 contacts, 2 recurring", "28%"],
  ["15:07", "ENFORCEMENT REGISTER", "query event", "41%"],
  ["15:44", "TEHIK", "record access", "58%"],
  ["16:20", "AMBULANCE ONBOARD CAMERA", "vehicle correlation", "71%"],
] as const;

export const presentDaySimulation = {
  subject: "ANONYMOUS CITIZEN",
  disclosure: [
    "NO SUCH OMNIWATCH SYSTEM IS CLAIMED TO EXIST.",
    "THE COMPONENT SYSTEMS DO.",
    "THE SIMULATION CONNECTS THEM.",
  ],
} as const;
