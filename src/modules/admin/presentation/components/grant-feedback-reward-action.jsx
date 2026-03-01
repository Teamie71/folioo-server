import React, { useState } from 'react';
import {
    Box,
    Button,
    FormGroup,
    H4,
    Input,
    Label,
    Message,
    Text,
    TextArea,
} from '@adminjs/design-system';
import { ApiClient } from 'adminjs';

const api = new ApiClient();

const GrantFeedbackRewardAction = (props) => {
    const [eventCode, setEventCode] = useState('');
    const [phoneNum, setPhoneNum] = useState('');
    const [externalSubmissionId, setExternalSubmissionId] = useState('');
    const [reviewedBy, setReviewedBy] = useState('');
    const [reviewNote, setReviewNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const onSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setResult(null);

        if (!eventCode.trim() || !phoneNum.trim()) {
            setError('eventCode와 phoneNum은 필수입니다.');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await api.resourceAction({
                resourceId: props.resource.id,
                actionName: props.action.name,
                data: {
                    eventCode: eventCode.trim(),
                    phoneNum: phoneNum.trim(),
                    externalSubmissionId: externalSubmissionId.trim() || undefined,
                    reviewedBy: reviewedBy.trim() || undefined,
                    reviewNote: reviewNote.trim() || undefined,
                },
                method: 'post',
            });

            if (response?.notice?.type === 'error') {
                setError(response.notice.message || '보상 지급에 실패했습니다.');
                return;
            }

            setResult(response?.data ?? null);
        } catch (requestError) {
            if (requestError instanceof Error) {
                setError(requestError.message);
            } else {
                setError('요청 중 알 수 없는 오류가 발생했습니다.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Box variant="grey">
            <Box variant="white" p="xl">
                <H4>전화번호 기준 이벤트 보상 지급</H4>
                <Text mb="xl">eventCode와 phoneNum을 기준으로 보상을 수동 지급합니다.</Text>

                {error ? (
                    <Message mb="lg" variant="danger">
                        {error}
                    </Message>
                ) : null}

                {result ? (
                    <Message mb="lg" variant="success">
                        지급 완료: userId={result.userId}, maskedPhoneNum={result.maskedPhoneNum},
                        rewardStatus={result.rewardStatus}, rewardGrantedAt={result.rewardGrantedAt}
                    </Message>
                ) : null}

                <form onSubmit={onSubmit}>
                    <FormGroup>
                        <Label required>Event Code</Label>
                        <Input
                            value={eventCode}
                            onChange={(inputEvent) => setEventCode(inputEvent.target.value)}
                            placeholder="예: FEEDBACK_REWARD"
                        />
                    </FormGroup>

                    <FormGroup>
                        <Label required>Phone Number</Label>
                        <Input
                            value={phoneNum}
                            onChange={(inputEvent) => setPhoneNum(inputEvent.target.value)}
                            placeholder="예: 01012345678"
                        />
                    </FormGroup>

                    <FormGroup>
                        <Label>External Submission ID (멱등 키)</Label>
                        <Input
                            value={externalSubmissionId}
                            onChange={(inputEvent) =>
                                setExternalSubmissionId(inputEvent.target.value)
                            }
                            placeholder="예: google-form-row-123"
                        />
                    </FormGroup>

                    <FormGroup>
                        <Label>Reviewed By</Label>
                        <Input
                            value={reviewedBy}
                            onChange={(inputEvent) => setReviewedBy(inputEvent.target.value)}
                            placeholder="예: pm.lee"
                        />
                    </FormGroup>

                    <FormGroup>
                        <Label>Review Note</Label>
                        <TextArea
                            value={reviewNote}
                            onChange={(inputEvent) => setReviewNote(inputEvent.target.value)}
                            rows={4}
                            placeholder="예: 유효 피드백 확인 완료"
                        />
                    </FormGroup>

                    <Button type="submit" variant="primary" disabled={isSubmitting}>
                        {isSubmitting ? '지급 중...' : '보상 지급'}
                    </Button>
                </form>
            </Box>
        </Box>
    );
};

export default GrantFeedbackRewardAction;
