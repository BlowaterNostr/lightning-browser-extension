import BudgetControl from "@components/BudgetControl";
import ConfirmOrCancel from "@components/ConfirmOrCancel";
import Container from "@components/Container";
import PaymentSummary from "@components/PaymentSummary";
import PublisherCard from "@components/PublisherCard";
import SuccessMessage from "@components/SuccessMessage";
import lightningPayReq from "bolt11";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useAccount } from "~/app/context/AccountContext";
import { USER_REJECTED_ERROR } from "~/common/constants";
import msg from "~/common/lib/msg";
import utils from "~/common/lib/utils";
import { getFiatValue } from "~/common/utils/currencyConvert";
import getOriginData from "~/extension/content-script/originData";
import { MetadataValidator } from "~/schema/metadataValidator";
import type { OriginData } from "~/types";

export type Props = {
  origin?: OriginData;
  paymentRequest?: string;
  metadata?: string;
};

function ConfirmPayment(props: Props) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const auth = useAccount();

  const invoiceRef = useRef(
    lightningPayReq.decode(
      props.paymentRequest || (searchParams.get("paymentRequest") as string)
    )
  );
  const originRef = useRef(props.origin || getOriginData());
  const metadataRef = useRef(props.metadata);
  const paymentRequestRef = useRef(
    props.paymentRequest || searchParams.get("paymentRequest")
  );
  const [budget, setBudget] = useState(
    ((invoiceRef.current?.satoshis || 0) * 10).toString()
  );
  const [fiatAmount, setFiatAmount] = useState("");

  useEffect(() => {
    (async () => {
      const res = await getFiatValue(budget);
      setFiatAmount(res);
    })();
  }, [budget]);

  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  async function confirm() {
    if (rememberMe && budget) {
      await saveBudget();
    }

    try {
      setLoading(true);
      // Not passing any metadata is also a valid metadata
      let isMetadataValid: boolean = true;
      if (props.metadata != undefined) {
        const metadataObject: object = JSON.parse(props.metadata);
        isMetadataValid = MetadataValidator(metadataObject);
      }
      if (isMetadataValid) {
        const response = await utils.call(
          "sendPayment",
          { paymentRequest: paymentRequestRef.current },
          { origin: originRef.current, metadata: metadataRef.current }
        );
        auth.fetchAccountInfo(); // Update balance.
        msg.reply(response);
        setSuccessMessage("Success, payment sent!");
      } else {
        toast.error(`Error: No valid metadata provided`);
      }
    } catch (e) {
      console.error(e);
      if (e instanceof Error) toast.error(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  function reject(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    if (props.paymentRequest && props.origin) {
      msg.error(USER_REJECTED_ERROR);
    } else {
      navigate(-1);
    }
  }

  function saveBudget() {
    if (!budget) return;
    return msg.request("addAllowance", {
      totalBudget: parseInt(budget),
      host: originRef.current.host,
      name: originRef.current.name,
      imageURL: originRef.current.icon,
    });
  }

  return (
    <div>
      <PublisherCard
        title={originRef.current.name}
        image={originRef.current.icon}
      />
      <div className="py-4">
        <Container maxWidth="sm">
          {!successMessage ? (
            <>
              <h1 className="dark:text-white font-bold mb-4">
                Approve payment
              </h1>
              <div className="mb-6">
                <PaymentSummary
                  amount={invoiceRef.current?.satoshis}
                  description={invoiceRef.current?.tagsObject.description}
                  metadata={props.metadata}
                />
              </div>

              <BudgetControl
                fiatAmount={fiatAmount}
                remember={rememberMe}
                onRememberChange={(event) => {
                  setRememberMe(event.target.checked);
                }}
                budget={budget}
                onBudgetChange={(event) => setBudget(event.target.value)}
              />

              <ConfirmOrCancel
                disabled={loading}
                loading={loading}
                onConfirm={confirm}
                onCancel={reject}
                label="Pay now"
              />
            </>
          ) : (
            <SuccessMessage
              message={successMessage}
              onClose={() => window.close()}
            />
          )}
        </Container>
      </div>
    </div>
  );
}

export default ConfirmPayment;
