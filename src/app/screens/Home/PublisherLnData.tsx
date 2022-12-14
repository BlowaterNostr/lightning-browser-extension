import PublisherCard from "@components/PublisherCard";
import { FC, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Button from "~/app/components/Button";
import lnurlLib from "~/common/lib/lnurl";
import { isLNURLDetailsError } from "~/common/utils/typeHelpers";
import type { Battery } from "~/types";

type Props = {
  lnData: Battery;
};

export const PublisherLnData: FC<Props> = ({ lnData }) => {
  const [loadingSendSats, setLoadingSendSats] = useState(false);

  const navigate = useNavigate();

  const { t } = useTranslation("translation", { keyPrefix: "home" });

  const sendSatoshis = async () => {
    try {
      setLoadingSendSats(true);

      const originData = {
        external: true,
        name: lnData.name,
        host: lnData.host,
        description: lnData.description,
        icon: lnData.icon,
      };

      if (lnData.method === "lnurl") {
        const lnurl = lnData.address;
        const lnurlDetails = await lnurlLib.getDetails(lnurl);
        if (isLNURLDetailsError(lnurlDetails)) {
          toast.error(lnurlDetails.reason);
          return;
        }

        if (lnurlDetails.tag === "payRequest") {
          navigate("/lnurlPay", {
            state: {
              origin: originData,
              args: {
                lnurlDetails,
              },
            },
          });
        }
      } else if (lnData.method === "keysend") {
        navigate("/keysend", {
          state: {
            origin: originData,
            args: {
              destination: lnData.address,
              customRecords:
                lnData.customKey && lnData.customValue
                  ? {
                      [lnData.customKey]: lnData.customValue,
                    }
                  : {},
            },
          },
        });
      }
    } catch (e) {
      if (e instanceof Error) toast.error(e.message);
    } finally {
      setLoadingSendSats(false);
    }
  };

  return (
    <div className="border-b border-gray-200 dark:border-neutral-500">
      <PublisherCard
        title={lnData.name}
        description={lnData.description}
        image={lnData.icon}
        isCard={false}
        isSmall={false}
      >
        <div className="flex gap-2">
          <Button label=<>🍬<br/> 5k</> onClick={() => onClick("5000")} fullWidth className="w-10" />
          <Button label=<>☕<br/> 1k</> onClick={() => onClick("5000")} fullWidth />
          <Button label=<>🍕<br/> 5k</> onClick={() => onClick("5000")} fullWidth />
          <Button label=<>🌯 50k</> onClick={() => onClick("5000")} fullWidth />
        </div>
      </PublisherCard>
    </div>
  );
};
