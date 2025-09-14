import React, { useState } from 'react';
import './App.css';
import AssessmentReport from './components/AssessmentReport';
import GradedQuestionnaire from './components/GradedQuestionnaire';
import Header from './components/Header';

function App() {
  const [currentStep, setCurrentStep] = useState('graded-form'); // start directly with graded questionnaire
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [error, setError] = useState(null);

  const handleGradedAssessment = async (result) => {
    setAssessmentResult(result);
    setCurrentStep('report');
  };

  const handleReset = () => {
    setCurrentStep('graded-form');
    setAssessmentResult(null);
    setError(null);
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'graded-form':
        return (
          <GradedQuestionnaire 
            businessType={'מסעדה'}
            onComplete={handleGradedAssessment}
          />
        );

      case 'report':
        return (
          <AssessmentReport 
            result={assessmentResult} 
            onReset={handleReset}
          />
        );
      
      default:
        return (
          <GradedQuestionnaire 
            businessType={'מסעדה'}
            onComplete={handleGradedAssessment}
          />
        );
    }
  };

  return (
    <div className="App">
      <Header />
      <main className="main-content">
        {error && (
          <div className="error" style={{ marginBottom: '20px' }}>
            {error}
          </div>
        )}
        
        {renderCurrentStep()}
      </main>
    </div>
  );
}

export default App;