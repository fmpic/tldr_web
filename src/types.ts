export interface TldrTarget {
  os: string;
  language: string;
}

export interface TldrCommand {
  name: string;
  platform: string[];
  language: string[];
  targets: TldrTarget[];
}

export interface TldrIndex {
  commands: TldrCommand[];
}
