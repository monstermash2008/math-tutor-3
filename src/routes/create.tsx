import { createFileRoute, useNavigate } from '@tanstack/react-router';
import ProblemCreator from '../components/ProblemCreator';

export const Route = createFileRoute('/create')({
  component: CreateProblem,
});

function CreateProblem() {
  const navigate = useNavigate();

  const handleSave = (problemId: string) => {
    console.log('Problem created with ID:', problemId);
    // Navigate to the problem library or the created problem
    navigate({ to: '/library' });
  };

  const handleCancel = () => {
    navigate({ to: '/' });
  };

  return (
    <ProblemCreator
      onSave={handleSave}
      onCancel={handleCancel}
    />
  );
} 