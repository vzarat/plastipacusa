import React from "react";
import { ProductVariant } from "@/types";
import { formatCurrency } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface SpecsTableProps {
  variants: ProductVariant[];
}

export function SpecsTable({ variants }: SpecsTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Engineering Dimension & Weight Matrix
          </h3>
          <p className="text-xs text-slate-500">
            Standard production roll sizes, pallet pack-outs, and case quantities.
          </p>
        </div>
        <Badge variant="default" className="font-mono text-xs font-bold">
          {variants.length} Matrix Items
        </Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Width</TableHead>
            <TableHead>Gauge</TableHead>
            <TableHead>Length</TableHead>
            <TableHead>Weight / Unit</TableHead>
            <TableHead>Pack / Case</TableHead>
            <TableHead>Pack / Pallet</TableHead>
            <TableHead className="text-right">Roll Price</TableHead>
            <TableHead className="text-right">Case Price</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {variants.map((v) => (
            <TableRow key={v.id} className="hover:bg-sky-50/50 font-mono text-xs">
              <TableCell className="font-bold text-sky-700">
                {v.sku}
              </TableCell>
              <TableCell className="text-slate-800">
                {parseFloat(v.widthInches)}"
              </TableCell>
              <TableCell className="text-slate-800">
                {v.gauge} Ga
              </TableCell>
              <TableCell className="text-slate-600">
                {v.lengthFeet.toLocaleString()} ft
              </TableCell>
              <TableCell className="text-slate-600">
                {v.weightLbs} lbs
              </TableCell>
              <TableCell className="text-slate-600">
                {v.rollsPerBox} rolls
              </TableCell>
              <TableCell className="text-slate-600">
                {v.rollsPerPallet} rolls
              </TableCell>
              <TableCell className="text-right font-sans font-bold text-slate-900">
                {formatCurrency(v.priceUsd)}
              </TableCell>
              <TableCell className="text-right font-sans font-bold text-sky-800">
                {v.casePriceUsd ? formatCurrency(v.casePriceUsd) : "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
