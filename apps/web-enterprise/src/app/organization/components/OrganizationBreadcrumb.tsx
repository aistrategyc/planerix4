// components/organization/OrganizationBreadcrumb.tsx
"use client";

import { ChevronRight, Home, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OrganizationBreadcrumbProps {
  organizationName: string;
  currentPage?: string;
  onNavigateHome?: () => void;
  onNavigateToOrg?: () => void;
}

export function OrganizationBreadcrumb({
  organizationName,
  currentPage,
  onNavigateHome,
  onNavigateToOrg
}: OrganizationBreadcrumbProps) {
  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={onNavigateHome}
        className="p-1 h-auto text-gray-600 hover:text-gray-900"
      >
        <Home className="w-4 h-4" />
      </Button>
      
      <ChevronRight className="w-4 h-4 text-gray-400" />
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onNavigateToOrg}
        className="p-1 h-auto text-gray-600 hover:text-gray-900 flex items-center gap-1"
      >
        <Building2 className="w-4 h-4" />
        <span className="max-w-[200px] truncate">{organizationName}</span>
      </Button>
      
      {currentPage && (
        <>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900 font-medium">{currentPage}</span>
        </>
      )}
    </nav>
  );
}
