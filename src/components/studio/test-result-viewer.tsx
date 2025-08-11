"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { 
  MagnifyingGlassIcon as Search, 
  FunnelIcon as Filter, 
  CheckCircleIcon as CheckCircle, 
  XCircleIcon as XCircle, 
  ClockIcon as Clock,
  DocumentDuplicateIcon as Copy,
  ArrowDownTrayIcon as Download,
  EyeIcon as Eye,
  EyeSlashIcon as EyeOff
} from "@heroicons/react/24/outline";
import { type ChatTestCase } from "./chat-test-case";

interface TestResultViewerProps {
  testCases: ChatTestCase[];
  onCopyResult: (testCaseId: string) => void;
  onExportResults: () => void;
}

export function TestResultViewer({
  testCases,
  onCopyResult,
  onExportResults
}: TestResultViewerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const [showResults, setShowResults] = useState(true);

  const filteredTestCases = testCases.filter(testCase => {
    const matchesSearch = testCase.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         testCase.result?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || testCase.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status?: ChatTestCase['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'running':
        return <Clock className="w-4 h-4 text-yellow-400 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status?: ChatTestCase['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-900 text-green-300 text-xs">Success</Badge>;
      case 'error':
        return <Badge className="bg-red-900 text-red-300 text-xs">Failed</Badge>;
      case 'running':
        return <Badge className="bg-yellow-900 text-yellow-300 text-xs">Running</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Pending</Badge>;
    }
  };

  const toggleExpanded = (testCaseId: string) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(testCaseId)) {
      newExpanded.delete(testCaseId);
    } else {
      newExpanded.add(testCaseId);
    }
    setExpandedResults(newExpanded);
  };

  const copyToClipboard = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  };

  const getStats = () => {
    const total = testCases.length;
    const completed = testCases.filter(tc => tc.status === 'success').length;
    const failed = testCases.filter(tc => tc.status === 'error').length;
    const running = testCases.filter(tc => tc.status === 'running').length;
    const pending = testCases.filter(tc => tc.status === 'pending').length;

    return { total, completed, failed, running, pending };
  };

  const stats = getStats();

  if (!showResults) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500">
        <div className="text-center">
          <EyeOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Results hidden</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Test Results</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowResults(!showResults)}
          >
            {showResults ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showResults ? 'Hide' : 'Show'} Results
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onExportResults}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="text-center p-3 bg-gray-800 rounded-lg">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-xs text-gray-400">Total</div>
        </div>
        <div className="text-center p-3 bg-green-900/20 rounded-lg">
          <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
          <div className="text-xs text-gray-400">Success</div>
        </div>
        <div className="text-center p-3 bg-red-900/20 rounded-lg">
          <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
          <div className="text-xs text-gray-400">Failed</div>
        </div>
        <div className="text-center p-3 bg-yellow-900/20 rounded-lg">
          <div className="text-2xl font-bold text-yellow-400">{stats.running}</div>
          <div className="text-xs text-gray-400">Running</div>
        </div>
        <div className="text-center p-3 bg-gray-800 rounded-lg">
          <div className="text-2xl font-bold text-gray-400">{stats.pending}</div>
          <div className="text-xs text-gray-400">Pending</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search results..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 bg-gray-800 border-gray-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-600">
            <SelectItem value="all" className="text-gray-300 focus:bg-gray-700">All</SelectItem>
            <SelectItem value="success" className="text-gray-300 focus:bg-gray-700">Success</SelectItem>
            <SelectItem value="error" className="text-gray-300 focus:bg-gray-700">Failed</SelectItem>
            <SelectItem value="running" className="text-gray-300 focus:bg-gray-700">Running</SelectItem>
            <SelectItem value="pending" className="text-gray-300 focus:bg-gray-700">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      <div className="space-y-3">
        {filteredTestCases.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No results found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          filteredTestCases.map((testCase) => (
            <Card key={testCase.id} className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(testCase.status)}
                    <div>
                      <h4 className="font-medium text-white">{testCase.name}</h4>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(testCase.status)}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(testCase.id)}
                      className="h-8 w-8 p-0"
                    >
                      {expandedResults.has(testCase.id) ? (
                        "↑"
                      ) : (
                        "↓"
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {expandedResults.has(testCase.id) && (
                <CardContent className="space-y-4">
                  {/* Input Messages */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-300 mb-2">Input Messages</h5>
                    <div className="space-y-2">
                      {testCase.messages?.map((message, index) => (
                        <div key={message.id} className="p-3 bg-gray-900 rounded border border-gray-700">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs capitalize">
                              {message.role}
                            </Badge>
                          </div>
                          {message.content && (
                            <p className="text-sm text-gray-300 whitespace-pre-wrap">{message.content}</p>
                          )}
                          {message.images && message.images.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-400 mb-1">{message.images.length} image(s)</p>
                              <div className="flex gap-2">
                                {message.images.map((image, imgIndex) => (
                                  <img
                                    key={imgIndex}
                                    src={image.data}
                                    alt={image.name}
                                    className="w-16 h-16 object-cover rounded border border-gray-600"
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Result */}
                  {testCase.result && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-medium text-gray-300">Result</h5>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(testCase.result!)}
                          className="h-6 px-2"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy
                        </Button>
                      </div>
                      <div className="p-3 bg-gray-900 rounded border border-gray-700">
                        <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                          {testCase.result}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {testCase.error && (
                    <div>
                      <h5 className="text-sm font-medium text-red-400 mb-2">Error</h5>
                      <div className="p-3 bg-red-900/20 rounded border border-red-700">
                        <p className="text-sm text-red-300">{testCase.error}</p>
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center gap-4 text-xs text-gray-400 pt-2 border-t border-gray-700">
                    {testCase.expectedOutput && (
                      <span>Expected: {testCase.expectedOutput}</span>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
} 