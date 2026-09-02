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
            Package Dimensions & Volume Price Matrix
          </h3>
          <p className="text-xs text-slate-500">
            Official production packaging sizes, roll count, and tier pricing.
          </p>
        </div>
        <Badge variant="default" className="font-mono text-xs font-bold">
          {variants.length} Package Options
        </Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Package Size Option</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Width</TableHead>
            <TableHead>Gauge</TableHead>
            <TableHead>Length</TableHead>
            <TableHead>Total Weight</TableHead>
            <TableHead>Total Rolls</TableHead>
            <TableHead className="text-right">Price (USD)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {variants.map((v) => (
            <TableRow key={v.id} className="hover:bg-sky-50/50 font-mono text-xs">
              <TableCell className="font-bold text-slate-900 font-sans">
                {(v as any).title || v.packageSize || v.sku}
              </TableCell>
              <TableCell className="text-sky-700 font-bold">
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
              <TableCell className="text-slate-600 font-sans font-medium">
                {(v as any).rolls_count || (v as any).rollsCount || v.rollsPerBox} rolls
              </TableCell>
              <TableCell className="text-right font-sans font-black text-slate-900 text-sm">
                {formatCurrency(v.priceUsd)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
