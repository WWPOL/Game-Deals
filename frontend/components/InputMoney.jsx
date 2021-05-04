import React, {
  useState,
} from "react";
import styled from "styled-components";
import {
  Button,
} from "antd";
import {
  DollarCircleOutlined,
  CaretUpOutlined,
  CaretDownOutlined,
} from "@ant-design/icons";

const El = styled.div`
display: flex;
border: 0.1rem solid white;
border-radius: 0.2rem;
height: 2rem;

/* Hide input buttons: https://stackoverflow.com/a/45396364 */
input[type="number"] {
  -webkit-appearance: textfield;
     -moz-appearance: textfield;
          appearance: textfield;
}
input[type=number]::-webkit-inner-spin-button, 
input[type=number]::-webkit-outer-spin-button { 
  -webkit-appearance: none;
}
`;

const Input = styled.input`
padding-left: 0.5rem;
padding-right: 0.5rem;
display: flex;
flex-grow: 1;
border: none;
background: none;
`;

const CurrencyLabel = styled.div`
padding-left: 0.5rem;
padding-right: 0.5rem;
display: flex;
border-right: 0.1rem solid white;
align-items: center;
`;

const CurrencySymbol = styled.div`
font-size: 1rem;
border: none;
`;

const IncrementButtons = styled.div`
display: flex;
flex-direction: column;
`;

const IncrementButton = styled(Button)`
height: 1rem;
padding: 0;
margin: 0;
display: flex;
border: none;
flex-direction: column;
align-items: center;
`;

const SymbolUp = styled(CaretUpOutlined)`
display: flex;
align-self: center;
`;

const SymbolDown = styled(CaretDownOutlined)`
display: flex;
align-self: center;
`;

/**
 * Input for an ammount of USD currency.
 */
const InputMoney = () => {
  const [value, setValue] = useState(0);

  return (
    <El>
      <CurrencyLabel>
        <CurrencySymbol>
          <DollarCircleOutlined />
        </CurrencySymbol>
      </CurrencyLabel>

      <Input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />

      <IncrementButtons>
        <IncrementButton
          icon={<SymbolUp />}
        >
        </IncrementButton>

        <IncrementButton
          icon={<SymbolDown />}
        >
        </IncrementButton>
      </IncrementButtons>
    </El>
  );
};

export default InputMoney;
