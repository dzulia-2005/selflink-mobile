import { Dispatch, SetStateAction } from 'react';

export type SelectSummaryProp = {
    city:string;
    country:string;
    latitude:number|null;
    longitude:number|null;
};

export type ContentProp = {
    mode:'choice' | 'form';
    handleSubmit:() => Promise<void>
    handleUseRegistrationData:() => Promise<void>
    handleClearCoordinate:() => void
    handleOpenMap:() => void
    hasSelectedCoordinate:boolean;
    isSubmitting:boolean;
    setMode:Dispatch<SetStateAction<'choice' | 'form'>>
    firstName:string;
    setFirstName:Dispatch<SetStateAction<string>>;
    city:string;
    country:string;
    latitude:number|null;
    longitude:number|null;
    lastName:string;
    setLastName:Dispatch<SetStateAction<string>>;
    setCity:Dispatch<SetStateAction<string>>;
    setTimeOfBirth:Dispatch<SetStateAction<string>>;
    setCountry:Dispatch<SetStateAction<string>>;
    dateOfBirth:string;
    setDateOfBirth:Dispatch<SetStateAction<string>>;
    timeOfBirth:string;
    isSubmitDisabled:boolean
};
