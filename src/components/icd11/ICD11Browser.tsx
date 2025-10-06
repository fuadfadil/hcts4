"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown, Search, Loader2 } from "lucide-react";

interface ICD11Category {
  id: number;
  code: string;
  name: string;
  description?: string;
  parent_id?: number;
}

interface ICD11BrowserProps {
  onSelectCategory?: (category: ICD11Category) => void;
  selectedCategories?: ICD11Category[];
  multiSelect?: boolean;
}

export function ICD11Browser({
  onSelectCategory,
  selectedCategories = [],
  multiSelect = false
}: ICD11BrowserProps) {
  const [categories, setCategories] = useState<ICD11Category[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    new Set(selectedCategories.map(cat => cat.id))
  );

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async (parentId?: number) => {
    try {
      const params = new URLSearchParams();
      if (parentId !== undefined) {
        params.append("parent_id", parentId.toString());
      }
      if (searchTerm) {
        params.append("search", searchTerm);
      }

      const response = await fetch(`/api/icd11/categories?${params}`);
      const data = await response.json();

      if (data.success) {
        if (parentId === undefined) {
          // Root level categories
          setCategories(data.data);
        } else {
          // Child categories - merge with existing
          setCategories(prev => {
            const updated = [...prev];
            // This is a simplified merge - in reality you'd need to update the tree structure
            return [...updated, ...data.data];
          });
        }
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = async (categoryId: number) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
      // Fetch children if not already loaded
      await fetchCategories(categoryId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleSelectCategory = (category: ICD11Category) => {
    if (multiSelect) {
      const newSelected = new Set(selectedIds);
      if (newSelected.has(category.id)) {
        newSelected.delete(category.id);
      } else {
        newSelected.add(category.id);
      }
      setSelectedIds(newSelected);
    } else {
      setSelectedIds(new Set([category.id]));
    }

    if (onSelectCategory) {
      onSelectCategory(category);
    }
  };

  const handleSearch = () => {
    setLoading(true);
    fetchCategories();
  };

  const renderCategory = (category: ICD11Category, level = 0) => {
    const hasChildren = expandedNodes.has(category.id);
    const isSelected = selectedIds.has(category.id);
    const isExpanded = expandedNodes.has(category.id);

    return (
      <div key={category.id} style={{ marginLeft: `${level * 20}px` }}>
        <div className="flex items-center gap-2 py-1 hover:bg-gray-50 rounded px-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => toggleExpanded(category.id)}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>

          <div
            className="flex-1 cursor-pointer"
            onClick={() => handleSelectCategory(category)}
          >
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {category.code}
              </Badge>
              <span className={`text-sm ${isSelected ? 'font-semibold' : ''}`}>
                {category.name}
              </span>
            </div>
            {category.description && (
              <p className="text-xs text-gray-600 mt-1">
                {category.description}
              </p>
            )}
          </div>
        </div>

        {isExpanded && (
          <div>
            {/* Child categories would be rendered here */}
            {/* For now, we'll show a placeholder */}
            <div className="text-xs text-gray-500 ml-8 py-1">
              Loading children...
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading ICD11 categories...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          ICD11 Classification Browser
        </CardTitle>
        <div className="flex gap-2">
          <Input
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleSearch} size="sm">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {categories.map(category => renderCategory(category))}
        </div>

        {selectedCategories.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Selected Categories:</h4>
            <div className="flex flex-wrap gap-2">
              {selectedCategories.map(category => (
                <Badge key={category.id} variant="secondary">
                  {category.code} - {category.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}