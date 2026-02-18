"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ClientType } from "@/types";

interface ClientSelectProps {
  clients: ClientType[];
  value: string;
  onChange: (value: string) => void;
}

export function ClientSelect({ clients, value, onChange }: ClientSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select a client" />
      </SelectTrigger>
      <SelectContent>
        {clients.map((client) => (
          <SelectItem key={client._id} value={client._id}>
            {client.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
