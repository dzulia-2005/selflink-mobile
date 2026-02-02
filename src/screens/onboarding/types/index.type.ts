export type InputProps = {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    required?: boolean;
    error?: string;
};


export type initialFormStateTypes = {
    first_name: string;
    last_name: string;
    birth_date: string;
    birth_time: string;
    birth_place_country: string;
    birth_place_city: string;
};
