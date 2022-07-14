import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { useSigner, useAccount } from "wagmi"

import BadgeForm from "../Forms/BadgeForm";
import SetForm from "../Forms/SetForm";
import FinalizeForm from "../Forms/FinalizeForm";
import MintForm from "../Forms/MintForm";

const CreationManager = () => {
    let navigate = useNavigate();
    const { address } = useAccount();
    const { data: signer } = useSigner();

    // TODO: Fix these default values -- stage and the default image file
    const [stage, setStage] = useState('createSet')
    
    const [badgeSetData, setBadgeSetData] = useState({'name': null, 'desc': null, 'imgFile': null});
    const [badgeSetDeploymentArgs, setBadgeSetDeploymentArgs] = useState();
    const [badgeData, setBadgeData] = useState([{'name': null, 'desc': null, 'imgFile':null}]);
    const [badgeId, setBadgeId] = useState(0);
    const [contractAddress, setContractAddress] = useState();

    useEffect(() => {        
        if(!address) {
            navigate('/')
        }
    }, [])

    function renderNewBadgeCreator() {
        return <BadgeForm
            key={`badge-${badgeId}`}
            setStage={setStage}
            badgeData={badgeData}
            setBadgeData={setBadgeData}
            setBadgeId={setBadgeId}
            badgeId={badgeId}
        />
    }

    useEffect(() => {
        renderNewBadgeCreator()
    }, [badgeId])

    return (
        <>
            {stage === 'createSet' &&
                <SetForm 
                    setStage={setStage}
                    badgeSetData={badgeSetData}
                    setBadgeSetData={setBadgeSetData}
                />
            }
            {stage === 'createBadge' &&
                renderNewBadgeCreator()
            }
            {stage === 'finalizeSet' &&
                <FinalizeForm 
                    setStage={setStage}
                    badgeSetData={badgeSetData}
                    badgeData={badgeData}
                    address={address}
                    signer={signer}
                    setContractAddress={setContractAddress}
                />
            }
            {stage === 'mintBadges' &&
                <MintForm
                    setStage={setStage}
                    address={address}
                    signer={signer}
                />
            }
        </>
    )
}

export default CreationManager;