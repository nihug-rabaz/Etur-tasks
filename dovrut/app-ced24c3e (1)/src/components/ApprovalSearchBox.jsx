import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ApprovalSearchBox({
  conceptCode,
  setConceptCode,
  onSearch,
  loading,
  error,
}) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-center text-2xl font-black sm:text-3xl">
          אישור קונספט
        </CardTitle>
        <p className="mt-2 text-center text-text-secondary">
          הזן את קוד הקונספט לאישור
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3">
          <Input
            placeholder="הזן קוד קונספט..."
            value={conceptCode}
            onChange={(e) => setConceptCode(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onSearch()}
            className="h-12 text-lg"
          />
          <Button
            onClick={onSearch}
            disabled={loading || !conceptCode.trim()}
            className="h-12 px-8"
          >
            <Search className="ml-2 h-5 w-5" />
            חפש
          </Button>
        </div>

        {error && (
          <Alert className="mt-4 border-0 bg-danger/10">
            <AlertDescription className="text-danger">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {loading && (
          <p className="mt-4 text-center text-text-secondary">טוען קונספט...</p>
        )}
      </CardContent>
    </Card>
  );
}
