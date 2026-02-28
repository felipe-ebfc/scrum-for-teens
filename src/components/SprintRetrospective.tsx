import React, { useState } from 'react';
import { useRetrospectives } from '@/hooks/useRetrospectives';
import RetroModal from './RetroModal';
import RetroHistory from './RetroHistory';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles } from 'lucide-react';

const SprintRetrospective: React.FC = () => {
  const { retros, loading, createRetro, deleteRetro } = useRetrospectives();
  const [modalOpen, setModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-800">Sprint Retrospective</h3>
          <Sparkles className="text-violet-500" size={28} />
        </div>
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6" />
              Sprint Retrospective
            </h3>
            <p className="text-violet-200 mt-1">
              {retros.length === 0
                ? 'Reflect, learn, grow — one sprint at a time'
                : `${retros.length} retrospective${retros.length === 1 ? '' : 's'} — keep it up! 🔥`}
            </p>
          </div>
          <Button
            onClick={() => setModalOpen(true)}
            className="bg-white text-violet-700 hover:bg-violet-50 font-semibold px-5 py-6 rounded-xl text-base shadow-md"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Retro
          </Button>
        </div>
      </div>

      {/* History */}
      <RetroHistory retros={retros} onDelete={deleteRetro} />

      {/* Modal */}
      <RetroModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={(data) => {
          createRetro(data);
        }}
      />
    </div>
  );
};

export default SprintRetrospective;
